create or replace function private.set_cart_item_quantity(
  requesting_user uuid,
  requested_product_id text,
  requested_option text,
  requested_quantity integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_product public.products%rowtype;
begin
  if requesting_user is null then raise exception '로그인이 필요합니다.'; end if;
  select * into selected_product from public.products where id = requested_product_id;
  if not found then raise exception '상품을 찾을 수 없습니다.'; end if;
  if selected_product.status <> 'active' or selected_product.stock < 1 then
    raise exception '현재 주문할 수 없는 상품입니다.';
  end if;
  if requested_quantity < 1 or requested_quantity > least(99, selected_product.stock) then
    raise exception '주문 가능한 수량은 1개부터 %개까지입니다.', least(99, selected_product.stock);
  end if;

  update public.cart_items
  set quantity = requested_quantity, updated_at = now()
  where user_id = requesting_user
    and product_id = requested_product_id
    and option_name = requested_option;

  if not found then raise exception '장바구니 상품을 찾을 수 없습니다.'; end if;
end;
$$;

create or replace function public.set_cart_item_quantity(p_product_id text, p_option text, p_quantity integer)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_cart_item_quantity((select auth.uid()), p_product_id, p_option, p_quantity)
$$;

revoke all on function public.set_cart_item_quantity(text, text, integer) from public;
revoke all on function private.set_cart_item_quantity(uuid, text, text, integer) from public;
grant execute on function public.set_cart_item_quantity(text, text, integer) to authenticated;
grant execute on function private.set_cart_item_quantity(uuid, text, text, integer) to authenticated;
