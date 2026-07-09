-- Phase 9B: Simplify checkout methods into cash and non_cash.
-- Historical qris and bank_transfer values remain allowed for existing rows.

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS check_order_payment_method;

ALTER TABLE orders
  ADD CONSTRAINT check_order_payment_method
  CHECK (payment_method IN ('cash', 'qris', 'bank_transfer', 'non_cash'));

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS check_transaction_payment_method;

ALTER TABLE transactions
  ADD CONSTRAINT check_transaction_payment_method
  CHECK (payment_method IN ('cash', 'qris', 'bank_transfer', 'non_cash'));

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS check_payment_payment_method;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS check_payments_payment_method;

ALTER TABLE payments
  ADD CONSTRAINT check_payments_payment_method
  CHECK (payment_method IN ('cash', 'qris', 'bank_transfer', 'non_cash'));

NOTIFY pgrst, 'reload schema';
