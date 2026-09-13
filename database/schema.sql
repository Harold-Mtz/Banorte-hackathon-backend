CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- tablle users

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- financial_profiles
CREATE TABLE IF NOT EXISTS financial_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE,

    monthly_income NUMERIC(14,2) NOT NULL DEFAULT 0,
    monthly_expenses NUMERIC(14,2) NOT NULL DEFAULT 0,
    current_savings NUMERIC(14,2) NOT NULL DEFAULT 0,
    current_debt NUMERIC(14,2) NOT NULL DEFAULT 0,

    credit_score INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_financial_profile_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_financial_profile_income
        CHECK (monthly_income >= 0),

    CONSTRAINT chk_financial_profile_expenses
        CHECK (monthly_expenses >= 0),

    CONSTRAINT chk_financial_profile_savings
        CHECK (current_savings >= 0),

    CONSTRAINT chk_financial_profile_debt
        CHECK (current_debt >= 0),

    CONSTRAINT chk_financial_profile_credit_score
        CHECK (
            credit_score IS NULL
            OR credit_score BETWEEN 300 AND 850
        )
);


-- life eventds
CREATE TABLE IF NOT EXISTS life_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    context JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_life_event_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_life_event_status
        CHECK (
            status IN (
                'ACTIVE',
                'COMPLETED',
                'CANCELLED'
            )
        )
);


 -- financial_producs

CREATE TABLE IF NOT EXISTS financial_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL,

    description TEXT,

    interest_rate NUMERIC(7,4),
    cat NUMERIC(7,4),

    minimum_amount NUMERIC(14,2),
    maximum_amount NUMERIC(14,2),

    minimum_term_months INTEGER,
    maximum_term_months INTEGER,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_financial_product_rate
        CHECK (
            interest_rate IS NULL
            OR interest_rate >= 0
        ),

    CONSTRAINT chk_financial_product_cat
        CHECK (
            cat IS NULL
            OR cat >= 0
        ),

    CONSTRAINT chk_financial_product_min_amount
        CHECK (
            minimum_amount IS NULL
            OR minimum_amount >= 0
        ),

    CONSTRAINT chk_financial_product_max_amount
        CHECK (
            maximum_amount IS NULL
            OR maximum_amount >= 0
        ),

    CONSTRAINT chk_financial_product_amount_range
        CHECK (
            minimum_amount IS NULL
            OR maximum_amount IS NULL
            OR minimum_amount <= maximum_amount
        ),

    CONSTRAINT chk_financial_product_term_range
        CHECK (
            minimum_term_months IS NULL
            OR maximum_term_months IS NULL
            OR minimum_term_months <= maximum_term_months
        )
);


-- savings_goals

CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,
    life_event_id UUID,

    name VARCHAR(150) NOT NULL,

    target_amount NUMERIC(14,2) NOT NULL,
    current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    monthly_contribution NUMERIC(14,2),

    target_date DATE,

    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_savings_goal_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_savings_goal_life_event
        FOREIGN KEY (life_event_id)
        REFERENCES life_events(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_savings_goal_target
        CHECK (target_amount > 0),

    CONSTRAINT chk_savings_goal_current
        CHECK (current_amount >= 0),

    CONSTRAINT chk_savings_goal_monthly
        CHECK (
            monthly_contribution IS NULL
            OR monthly_contribution >= 0
        ),

    CONSTRAINT chk_savings_goal_status
        CHECK (
            status IN (
                'ACTIVE',
                'COMPLETED',
                'CANCELLED'
            )
        )
);

-- financial_movements: auditable deposits, withdrawals, expenses and income
CREATE TABLE IF NOT EXISTS financial_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES savings_goals(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    category VARCHAR(80),
    note VARCHAR(240),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_financial_movement_type CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'EXPENSE', 'INCOME')),
    CONSTRAINT chk_financial_movement_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_financial_movements_user_date ON financial_movements(user_id, occurred_at DESC);


-- mortgage_simulations

CREATE TABLE IF NOT EXISTS mortgage_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,
    life_event_id UUID,
    financial_product_id UUID,

    property_value NUMERIC(14,2) NOT NULL,
    down_payment NUMERIC(14,2) NOT NULL,

    loan_amount NUMERIC(14,2) NOT NULL,

    term_months INTEGER NOT NULL,
    annual_interest_rate NUMERIC(7,4) NOT NULL,

    monthly_payment NUMERIC(14,2) NOT NULL,
    total_payment NUMERIC(14,2) NOT NULL,
    total_interest NUMERIC(14,2) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_mortgage_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_mortgage_life_event
        FOREIGN KEY (life_event_id)
        REFERENCES life_events(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_mortgage_product
        FOREIGN KEY (financial_product_id)
        REFERENCES financial_products(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_mortgage_property
        CHECK (property_value > 0),

    CONSTRAINT chk_mortgage_down_payment
        CHECK (
            down_payment >= 0
            AND down_payment < property_value
        ),

    CONSTRAINT chk_mortgage_loan
        CHECK (loan_amount > 0),

    CONSTRAINT chk_mortgage_term
        CHECK (term_months > 0),

    CONSTRAINT chk_mortgage_rate
        CHECK (annual_interest_rate >= 0),

    CONSTRAINT chk_mortgage_monthly_payment
        CHECK (monthly_payment >= 0),

    CONSTRAINT chk_mortgage_total_payment
        CHECK (total_payment >= 0),

    CONSTRAINT chk_mortgage_total_interest
        CHECK (total_interest >= 0)
);

-- agent_sessions

CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,
    life_event_id UUID,

    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    current_intent VARCHAR(100),

    context JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_agent_session_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_agent_session_life_event
        FOREIGN KEY (life_event_id)
        REFERENCES life_events(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_agent_session_status
        CHECK (
            status IN (
                'ACTIVE',
                'COMPLETED',
                'EXPIRED',
                'CANCELLED'
            )
        )
);


-- agent_messages
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL,

    role VARCHAR(30) NOT NULL,

    content TEXT NOT NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_agent_message_session
        FOREIGN KEY (session_id)
        REFERENCES agent_sessions(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_agent_message_role
        CHECK (
            role IN (
                'USER',
                'ASSISTANT',
                'TOOL',
                'SYSTEM'
            )
        )
);


-- interactions

CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL,

    component_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,

    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_interaction_session
        FOREIGN KEY (session_id)
        REFERENCES agent_sessions(id)
        ON DELETE CASCADE
);


-- ui_states

CREATE TABLE IF NOT EXISTS ui_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL,

    version INTEGER NOT NULL,

    schema JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ui_state_session
        FOREIGN KEY (session_id)
        REFERENCES agent_sessions(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_ui_state_session_version
        UNIQUE (session_id, version),

    CONSTRAINT chk_ui_state_version
        CHECK (version > 0)
);


-- indexes
CREATE INDEX IF NOT EXISTS idx_financial_profiles_user
    ON financial_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_life_events_user
    ON life_events(user_id);

CREATE INDEX IF NOT EXISTS idx_life_events_type
    ON life_events(type);

CREATE INDEX IF NOT EXISTS idx_life_events_status
    ON life_events(status);

CREATE INDEX IF NOT EXISTS idx_financial_products_type
    ON financial_products(type);

CREATE INDEX IF NOT EXISTS idx_financial_products_active
    ON financial_products(is_active);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user
    ON savings_goals(user_id);

CREATE INDEX IF NOT EXISTS idx_savings_goals_life_event
    ON savings_goals(life_event_id);

CREATE INDEX IF NOT EXISTS idx_mortgage_simulations_user
    ON mortgage_simulations(user_id);

CREATE INDEX IF NOT EXISTS idx_mortgage_simulations_life_event
    ON mortgage_simulations(life_event_id);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user
    ON agent_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_life_event
    ON agent_sessions(life_event_id);

CREATE INDEX IF NOT EXISTS idx_agent_messages_session
    ON agent_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_interactions_session
    ON interactions(session_id);

CREATE INDEX IF NOT EXISTS idx_ui_states_session
    ON ui_states(session_id);