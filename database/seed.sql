-- ============================================================
-- DEMO USER
-- ============================================================

INSERT INTO users (
    id,
    name,
    email,
    password_hash
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Ana Martínez',
    'ana.martinez@demo.com',
    '$2b$12$2jPMnubdEUPuEg2pu9gkZO9.aVrArIDQR1kpPGopVcDxSgkcZ8UjW'
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash;


-- ============================================================
-- FINANCIAL PROFILE
-- ============================================================

INSERT INTO financial_profiles (
    user_id,
    monthly_income,
    monthly_expenses,
    current_savings,
    current_debt,
    credit_score
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    35000.00,
    12000.00,
    180000.00,
    4000.00,
    735
)
ON CONFLICT (user_id) DO NOTHING;


-- ============================================================
-- MORTGAGE PRODUCTS
-- ============================================================

INSERT INTO financial_products (
    id,
    name,
    type,
    description,
    interest_rate,
    cat,
    minimum_amount,
    maximum_amount,
    minimum_term_months,
    maximum_term_months,
    metadata
)
VALUES
(
    '22222222-2222-2222-2222-222222222221',

    'Hipoteca Tradicional',

    'MORTGAGE',

    'Crédito hipotecario con mensualidades fijas.',

    10.5000,
    12.1000,

    300000.00,
    5000000.00,

    60,
    240,

    '{
        "downPaymentPercentage": 10,
        "paymentType": "FIXED"
    }'::jsonb
),
(
    '22222222-2222-2222-2222-222222222222',

    'Hipoteca Flexible',

    'MORTGAGE',

    'Crédito hipotecario con plazo flexible.',

    11.2000,
    12.8000,

    300000.00,
    6000000.00,

    60,
    300,

    '{
        "downPaymentPercentage": 10,
        "paymentType": "FLEXIBLE"
    }'::jsonb
);


-- ============================================================
-- FIRST HOME LIFE EVENT
-- ============================================================

INSERT INTO life_events (
    id,
    user_id,
    type,
    title,
    status,
    context
)
VALUES (
    '33333333-3333-3333-3333-333333333333',

    '11111111-1111-1111-1111-111111111111',

    'FIRST_HOME',

    'Comprar mi primera casa',

    'ACTIVE',

    '{
        "propertyBudget": 1800000,
        "preferredTermMonths": 240,
        "expectedDownPayment": 180000
    }'::jsonb
);