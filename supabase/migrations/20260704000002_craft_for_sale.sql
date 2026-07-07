-- "For sale" support on crafts/vehicles. Owner toggles this per item in the
-- admin; the public listing shows a FOR SALE badge and an inquiry action.
-- sale_price is whole dollars (nullable — null renders as "price on request").

ALTER TABLE public.crafts
  ADD COLUMN IF NOT EXISTS for_sale   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_price integer;
