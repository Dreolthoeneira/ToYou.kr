-- Require an authenticated member for every order creation path.
create or replace function private.create_store_order(requesting_user uuid, order_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_product public.products%rowtype;
  saved_order public.orders%rowtype;
  updated_product public.products%rowtype;
  requested_quantity integer;
  selected_option text;
  subtotal integer;
begin
  if requesting_user is null then raise exception '로그인이 필요합니다.'; end if;

  requested_quantity := greatest(1, least(99, coalesce((order_data ->> 'quantity')::integer, 1)));
  selected_option := left(trim(coalesce(order_data ->> 'option', '')), 200);

  if length(trim(coalesce(order_data ->> 'customerName', ''))) < 2
    or length(regexp_replace(coalesce(order_data ->> 'phone', ''), '[^0-9]', '', 'g')) < 9
    or length(trim(coalesce(order_data ->> 'address', ''))) < 5 then
    raise exception '주문자와 배송지 정보를 확인해 주세요.';
  end if;

  select * into selected_product
  from public.products
  where id = order_data ->> 'productId' and status = 'active'
  for update;

  if not found then raise exception '판매 중인 상품을 찾을 수 없습니다.'; end if;
  if selected_product.stock < requested_quantity then raise exception '주문 가능한 재고가 부족합니다.'; end if;
  if jsonb_array_length(selected_product.options_json) > 0 and not (selected_product.options_json ? selected_option) then
    raise exception '상품 옵션을 다시 선택해 주세요.';
  end if;

  subtotal := selected_product.price * requested_quantity;
  insert into public.orders (
    id, user_id, product_id, product_name, option_name, quantity, total, customer_name,
    phone, address, payment_method, delivery_note, status, created_at
  ) values (
    'ord-' || gen_random_uuid()::text,
    requesting_user,
    selected_product.id,
    selected_product.name,
    selected_option,
    requested_quantity,
    subtotal + case when subtotal >= 70000 then 0 else 3000 end,
    left(trim(order_data ->> 'customerName'), 100),
    left(trim(order_data ->> 'phone'), 40),
    left(trim(order_data ->> 'address'), 1000),
    case when order_data ->> 'paymentMethod' in ('card', 'kakao', 'naver') then order_data ->> 'paymentMethod' else 'card' end,
    left(trim(coalesce(order_data ->> 'deliveryNote', '')), 1000),
    'paid',
    now()
  ) returning * into saved_order;

  update public.products
  set stock = stock - requested_quantity,
      status = case when stock - requested_quantity = 0 then 'soldout' else status end,
      updated_at = now()
  where id = selected_product.id
  returning * into updated_product;

  return jsonb_build_object('order', to_jsonb(saved_order), 'product', to_jsonb(updated_product));
end;
$$;

revoke execute on function public.create_store_order(jsonb) from anon;
revoke execute on function private.create_store_order(uuid, jsonb) from anon;
grant execute on function public.create_store_order(jsonb) to authenticated;
