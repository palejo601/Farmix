--
-- PostgreSQL database dump
--

\restrict nNXZBcCfofQAJ36rqtiw4gDa3wfGRwHclgaWA71cLVsLZFPls0a0hEXPfv4zn4S

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    user_id uuid,
    action text NOT NULL,
    resource text NOT NULL,
    resource_id text,
    outcome text NOT NULL,
    request_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_logs_outcome_check CHECK ((outcome = ANY (ARRAY['success'::text, 'failure'::text])))
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: dev_mailbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dev_mailbox (
    id bigint NOT NULL,
    to_email text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dev_mailbox_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dev_mailbox_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dev_mailbox_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dev_mailbox_id_seq OWNED BY public.dev_mailbox.id;


--
-- Name: diagnoses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnoses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drugstore_id uuid NOT NULL,
    instrument_version_id uuid NOT NULL,
    performed_on date NOT NULL,
    notes text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT diagnoses_notes_check CHECK (((notes IS NULL) OR (char_length(notes) <= 1000))),
    CONSTRAINT diagnoses_performed_on_check CHECK (((performed_on >= '2000-01-01'::date) AND (performed_on <= '2100-12-31'::date)))
);


--
-- Name: diagnosis_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnosis_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    diagnosis_id uuid NOT NULL,
    version_id uuid NOT NULL,
    item_id uuid NOT NULL,
    score smallint NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT diagnosis_answers_score_check CHECK (((score >= 1) AND (score <= 5)))
);


--
-- Name: diagnosis_area_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnosis_area_scores (
    diagnosis_id uuid NOT NULL,
    area text NOT NULL,
    area_score numeric(2,1) NOT NULL,
    answered_count integer NOT NULL,
    CONSTRAINT diagnosis_area_scores_answered_count_check CHECK ((answered_count >= 1)),
    CONSTRAINT diagnosis_area_scores_area_check CHECK ((area = ANY (ARRAY['residuos'::text, 'vencimientos'::text, 'segregacion'::text, 'personal_capacitacion'::text, 'documentacion'::text]))),
    CONSTRAINT diagnosis_area_scores_area_score_check CHECK (((area_score >= (1)::numeric) AND (area_score <= (5)::numeric)))
);


--
-- Name: drugstore_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drugstore_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drugstore_id uuid NOT NULL,
    user_id uuid NOT NULL,
    member_role text NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT drugstore_members_member_role_check CHECK ((member_role = ANY (ARRAY['propietario'::text, 'administrador'::text, 'operador'::text])))
);


--
-- Name: drugstores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drugstores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    city text DEFAULT 'Sincelejo'::text NOT NULL,
    expiry_alert_days integer DEFAULT 60 NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT drugstores_city_check CHECK (((char_length(city) >= 2) AND (char_length(city) <= 80))),
    CONSTRAINT drugstores_expiry_alert_days_check CHECK (((expiry_alert_days >= 1) AND (expiry_alert_days <= 365))),
    CONSTRAINT drugstores_name_check CHECK (((char_length(name) >= 2) AND (char_length(name) <= 120)))
);


--
-- Name: expiration_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expiration_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drugstore_id uuid NOT NULL,
    product_name text NOT NULL,
    batch text NOT NULL,
    sanitary_registry text,
    holder text,
    expires_on date NOT NULL,
    quantity integer NOT NULL,
    unit_cost numeric(12,2) DEFAULT 0 NOT NULL,
    destination text DEFAULT 'pendiente'::text NOT NULL,
    managed_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT expiration_products_batch_check CHECK (((char_length(batch) >= 1) AND (char_length(batch) <= 60))),
    CONSTRAINT expiration_products_destination_check CHECK ((destination = ANY (ARRAY['pendiente'::text, 'devolucion_proveedor'::text, 'disposicion_final'::text, 'otro'::text]))),
    CONSTRAINT expiration_products_expires_on_check CHECK (((expires_on >= '2000-01-01'::date) AND (expires_on <= '2100-12-31'::date))),
    CONSTRAINT expiration_products_holder_check CHECK (((holder IS NULL) OR ((char_length(holder) >= 1) AND (char_length(holder) <= 120)))),
    CONSTRAINT expiration_products_managed_ck CHECK (((destination = 'pendiente'::text) = (managed_at IS NULL))),
    CONSTRAINT expiration_products_product_name_check CHECK (((char_length(product_name) >= 1) AND (char_length(product_name) <= 160))),
    CONSTRAINT expiration_products_quantity_check CHECK (((quantity >= 1) AND (quantity <= 1000000))),
    CONSTRAINT expiration_products_sanitary_registry_check CHECK (((sanitary_registry IS NULL) OR ((char_length(sanitary_registry) >= 1) AND (char_length(sanitary_registry) <= 60)))),
    CONSTRAINT expiration_products_unit_cost_check CHECK ((unit_cost >= (0)::numeric))
);


--
-- Name: imports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drugstore_id uuid NOT NULL,
    kind text NOT NULL,
    file_name text NOT NULL,
    phase text DEFAULT 'vista_previa'::text NOT NULL,
    total_rows integer NOT NULL,
    valid_rows integer NOT NULL,
    invalid_rows integer NOT NULL,
    duplicate_rows integer NOT NULL,
    row_results jsonb NOT NULL,
    inserted_count integer,
    expires_at timestamp with time zone NOT NULL,
    confirmed_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT imports_confirmed_ck CHECK (((phase = 'confirmada'::text) = (confirmed_at IS NOT NULL))),
    CONSTRAINT imports_duplicate_rows_check CHECK ((duplicate_rows >= 0)),
    CONSTRAINT imports_file_name_check CHECK (((char_length(file_name) >= 1) AND (char_length(file_name) <= 120))),
    CONSTRAINT imports_invalid_rows_check CHECK ((invalid_rows >= 0)),
    CONSTRAINT imports_kind_check CHECK ((kind = ANY (ARRAY['expirations'::text, 'waste'::text, 'segregation'::text]))),
    CONSTRAINT imports_phase_check CHECK ((phase = ANY (ARRAY['vista_previa'::text, 'confirmada'::text]))),
    CONSTRAINT imports_total_rows_check CHECK ((total_rows >= 0)),
    CONSTRAINT imports_valid_rows_check CHECK ((valid_rows >= 0))
);


--
-- Name: improvement_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.improvement_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drugstore_id uuid NOT NULL,
    finding text NOT NULL,
    corrective_action text NOT NULL,
    responsible text NOT NULL,
    due_on date NOT NULL,
    progress_state text DEFAULT 'pendiente'::text NOT NULL,
    closed_on date,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT improvement_actions_closed_ck CHECK (((progress_state = 'cerrada'::text) = (closed_on IS NOT NULL))),
    CONSTRAINT improvement_actions_corrective_action_check CHECK (((char_length(corrective_action) >= 3) AND (char_length(corrective_action) <= 500))),
    CONSTRAINT improvement_actions_due_on_check CHECK (((due_on >= '2000-01-01'::date) AND (due_on <= '2100-12-31'::date))),
    CONSTRAINT improvement_actions_finding_check CHECK (((char_length(finding) >= 3) AND (char_length(finding) <= 500))),
    CONSTRAINT improvement_actions_progress_state_check CHECK ((progress_state = ANY (ARRAY['pendiente'::text, 'en_curso'::text, 'cerrada'::text]))),
    CONSTRAINT improvement_actions_responsible_check CHECK (((char_length(responsible) >= 2) AND (char_length(responsible) <= 120)))
);


--
-- Name: instrument_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instrument_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version_id uuid NOT NULL,
    area text NOT NULL,
    item_code text NOT NULL,
    prompt_text text NOT NULL,
    "position" integer NOT NULL,
    CONSTRAINT instrument_items_area_check CHECK ((area = ANY (ARRAY['residuos'::text, 'vencimientos'::text, 'segregacion'::text, 'personal_capacitacion'::text, 'documentacion'::text]))),
    CONSTRAINT instrument_items_position_check CHECK (("position" >= 1))
);


--
-- Name: instrument_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instrument_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version_number integer NOT NULL,
    title text NOT NULL,
    description text,
    is_current boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT instrument_versions_version_number_check CHECK ((version_number >= 1))
);


--
-- Name: local_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.local_migrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    drugstore_id uuid NOT NULL,
    content_hash text NOT NULL,
    is_demo boolean DEFAULT false NOT NULL,
    phase text DEFAULT 'pendiente'::text NOT NULL,
    payload jsonb NOT NULL,
    summary jsonb NOT NULL,
    inserted_ids jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    reverted_at timestamp with time zone,
    CONSTRAINT local_migrations_content_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT local_migrations_phase_check CHECK ((phase = ANY (ARRAY['pendiente'::text, 'confirmada'::text, 'revertida'::text]))),
    CONSTRAINT local_migrations_phase_ck CHECK ((((phase = 'pendiente'::text) AND (confirmed_at IS NULL) AND (reverted_at IS NULL)) OR ((phase = 'confirmada'::text) AND (confirmed_at IS NOT NULL) AND (reverted_at IS NULL)) OR ((phase = 'revertida'::text) AND (confirmed_at IS NOT NULL) AND (reverted_at IS NOT NULL))))
);


--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_resets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    filename text NOT NULL,
    checksum text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: segregation_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.segregation_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drugstore_id uuid NOT NULL,
    checked_on date NOT NULL,
    items_reviewed integer NOT NULL,
    items_correct integer NOT NULL,
    location text NOT NULL,
    observations text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT segregation_checks_checked_on_check CHECK (((checked_on >= '2000-01-01'::date) AND (checked_on <= '2100-12-31'::date))),
    CONSTRAINT segregation_checks_correct_le_reviewed_ck CHECK ((items_correct <= items_reviewed)),
    CONSTRAINT segregation_checks_items_correct_check CHECK ((items_correct >= 0)),
    CONSTRAINT segregation_checks_items_reviewed_check CHECK (((items_reviewed >= 1) AND (items_reviewed <= 100000))),
    CONSTRAINT segregation_checks_location_check CHECK (((char_length(location) >= 1) AND (char_length(location) <= 120))),
    CONSTRAINT segregation_checks_observations_check CHECK (((observations IS NULL) OR (char_length(observations) <= 500)))
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone
);


--
-- Name: support_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drugstore_id uuid NOT NULL,
    original_name text NOT NULL,
    stored_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL,
    sha256 text NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT support_files_mime_type_check CHECK ((mime_type = ANY (ARRAY['application/pdf'::text, 'image/png'::text, 'image/jpeg'::text]))),
    CONSTRAINT support_files_original_name_check CHECK (((char_length(original_name) >= 1) AND (char_length(original_name) <= 120))),
    CONSTRAINT support_files_sha256_check CHECK ((sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT support_files_size_bytes_check CHECK (((size_bytes >= 1) AND (size_bytes <= 5242880))),
    CONSTRAINT support_files_stored_name_check CHECK ((stored_name ~ '^[a-f0-9]{32}\.(pdf|png|jpg)$'::text))
);


--
-- Name: training_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drugstore_id uuid NOT NULL,
    topic_name text NOT NULL,
    validity_months integer DEFAULT 12 NOT NULL,
    description text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT training_topics_description_check CHECK (((description IS NULL) OR (char_length(description) <= 300))),
    CONSTRAINT training_topics_topic_name_check CHECK (((char_length(topic_name) >= 2) AND (char_length(topic_name) <= 120))),
    CONSTRAINT training_topics_validity_months_check CHECK (((validity_months >= 1) AND (validity_months <= 60)))
);


--
-- Name: trainings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drugstore_id uuid NOT NULL,
    worker_id uuid NOT NULL,
    topic_id uuid NOT NULL,
    trained_on date,
    valid_until date,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    support_file_id uuid,
    CONSTRAINT trainings_dates_ck CHECK ((((trained_on IS NULL) AND (valid_until IS NULL)) OR ((trained_on IS NOT NULL) AND (valid_until IS NOT NULL) AND (valid_until >= trained_on))))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    privacy_accepted_at timestamp with time zone,
    privacy_version text,
    failed_login_count integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    deletion_requested_at timestamp with time zone,
    deletion_scheduled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_deletion_pair CHECK (((deletion_requested_at IS NULL) = (deletion_scheduled_at IS NULL))),
    CONSTRAINT users_failed_login_count_check CHECK ((failed_login_count >= 0)),
    CONSTRAINT users_full_name_check CHECK (((char_length(full_name) >= 2) AND (char_length(full_name) <= 120)))
);


--
-- Name: waste_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waste_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drugstore_id uuid NOT NULL,
    recorded_on date NOT NULL,
    classification text NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit text NOT NULL,
    origin text,
    notes text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT waste_records_classification_check CHECK ((classification = ANY (ARRAY['riesgo_biologico'::text, 'peligroso_quimico'::text, 'aprovechable'::text, 'organico_aprovechable'::text, 'no_aprovechable'::text]))),
    CONSTRAINT waste_records_expired_med_ck CHECK ((NOT ((origin = 'medicamento_vencido'::text) AND (classification = 'riesgo_biologico'::text)))),
    CONSTRAINT waste_records_notes_check CHECK (((notes IS NULL) OR (char_length(notes) <= 500))),
    CONSTRAINT waste_records_origin_check CHECK ((origin = ANY (ARRAY['medicamento_vencido'::text, 'otro'::text]))),
    CONSTRAINT waste_records_quantity_check CHECK (((quantity > (0)::numeric) AND (quantity <= (100000)::numeric))),
    CONSTRAINT waste_records_recorded_on_check CHECK (((recorded_on >= '2000-01-01'::date) AND (recorded_on <= '2100-12-31'::date))),
    CONSTRAINT waste_records_unit_check CHECK ((unit = ANY (ARRAY['kg'::text, 'g'::text])))
);


--
-- Name: workers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drugstore_id uuid NOT NULL,
    worker_code text NOT NULL,
    full_name text NOT NULL,
    job_title text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT workers_full_name_check CHECK (((char_length(full_name) >= 2) AND (char_length(full_name) <= 120))),
    CONSTRAINT workers_job_title_check CHECK (((job_title IS NULL) OR ((char_length(job_title) >= 1) AND (char_length(job_title) <= 80)))),
    CONSTRAINT workers_worker_code_check CHECK (((char_length(worker_code) >= 1) AND (char_length(worker_code) <= 30)))
);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: dev_mailbox id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_mailbox ALTER COLUMN id SET DEFAULT nextval('public.dev_mailbox_id_seq'::regclass);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: dev_mailbox dev_mailbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_mailbox
    ADD CONSTRAINT dev_mailbox_pkey PRIMARY KEY (id);


--
-- Name: diagnoses diagnoses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_pkey PRIMARY KEY (id);


--
-- Name: diagnoses diagnoses_tenant_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_tenant_uq UNIQUE (drugstore_id, id);


--
-- Name: diagnoses diagnoses_version_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_version_uq UNIQUE (id, instrument_version_id);


--
-- Name: diagnosis_answers diagnosis_answers_diagnosis_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_answers
    ADD CONSTRAINT diagnosis_answers_diagnosis_id_item_id_key UNIQUE (diagnosis_id, item_id);


--
-- Name: diagnosis_answers diagnosis_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_answers
    ADD CONSTRAINT diagnosis_answers_pkey PRIMARY KEY (id);


--
-- Name: diagnosis_area_scores diagnosis_area_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_area_scores
    ADD CONSTRAINT diagnosis_area_scores_pkey PRIMARY KEY (diagnosis_id, area);


--
-- Name: drugstore_members drugstore_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drugstore_members
    ADD CONSTRAINT drugstore_members_pkey PRIMARY KEY (id);


--
-- Name: drugstores drugstores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drugstores
    ADD CONSTRAINT drugstores_pkey PRIMARY KEY (id);


--
-- Name: expiration_products expiration_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiration_products
    ADD CONSTRAINT expiration_products_pkey PRIMARY KEY (id);


--
-- Name: expiration_products expiration_products_tenant_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiration_products
    ADD CONSTRAINT expiration_products_tenant_uq UNIQUE (drugstore_id, id);


--
-- Name: imports imports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT imports_pkey PRIMARY KEY (id);


--
-- Name: imports imports_tenant_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT imports_tenant_uq UNIQUE (drugstore_id, id);


--
-- Name: improvement_actions improvement_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.improvement_actions
    ADD CONSTRAINT improvement_actions_pkey PRIMARY KEY (id);


--
-- Name: improvement_actions improvement_actions_tenant_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.improvement_actions
    ADD CONSTRAINT improvement_actions_tenant_uq UNIQUE (drugstore_id, id);


--
-- Name: instrument_items instrument_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrument_items
    ADD CONSTRAINT instrument_items_pkey PRIMARY KEY (id);


--
-- Name: instrument_items instrument_items_version_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrument_items
    ADD CONSTRAINT instrument_items_version_id_id_key UNIQUE (version_id, id);


--
-- Name: instrument_items instrument_items_version_id_item_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrument_items
    ADD CONSTRAINT instrument_items_version_id_item_code_key UNIQUE (version_id, item_code);


--
-- Name: instrument_versions instrument_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrument_versions
    ADD CONSTRAINT instrument_versions_pkey PRIMARY KEY (id);


--
-- Name: instrument_versions instrument_versions_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrument_versions
    ADD CONSTRAINT instrument_versions_version_number_key UNIQUE (version_number);


--
-- Name: local_migrations local_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_migrations
    ADD CONSTRAINT local_migrations_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_token_hash_key UNIQUE (token_hash);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename);


--
-- Name: segregation_checks segregation_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segregation_checks
    ADD CONSTRAINT segregation_checks_pkey PRIMARY KEY (id);


--
-- Name: segregation_checks segregation_checks_tenant_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segregation_checks
    ADD CONSTRAINT segregation_checks_tenant_uq UNIQUE (drugstore_id, id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: support_files support_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_files
    ADD CONSTRAINT support_files_pkey PRIMARY KEY (id);


--
-- Name: support_files support_files_stored_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_files
    ADD CONSTRAINT support_files_stored_name_key UNIQUE (stored_name);


--
-- Name: support_files support_files_tenant_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_files
    ADD CONSTRAINT support_files_tenant_uq UNIQUE (drugstore_id, id);


--
-- Name: training_topics training_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_topics
    ADD CONSTRAINT training_topics_pkey PRIMARY KEY (id);


--
-- Name: training_topics training_topics_tenant_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_topics
    ADD CONSTRAINT training_topics_tenant_uq UNIQUE (drugstore_id, id);


--
-- Name: trainings trainings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_pkey PRIMARY KEY (id);


--
-- Name: trainings trainings_tenant_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_tenant_uq UNIQUE (drugstore_id, id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: waste_records waste_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_records
    ADD CONSTRAINT waste_records_pkey PRIMARY KEY (id);


--
-- Name: waste_records waste_records_tenant_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_records
    ADD CONSTRAINT waste_records_tenant_uq UNIQUE (drugstore_id, id);


--
-- Name: workers workers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workers
    ADD CONSTRAINT workers_pkey PRIMARY KEY (id);


--
-- Name: workers workers_tenant_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workers
    ADD CONSTRAINT workers_tenant_uq UNIQUE (drugstore_id, id);


--
-- Name: audit_logs_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_user_idx ON public.audit_logs USING btree (user_id, created_at DESC);


--
-- Name: diagnoses_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diagnoses_date_idx ON public.diagnoses USING btree (drugstore_id, performed_on DESC) WHERE (deleted_at IS NULL);


--
-- Name: drugstore_members_active_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX drugstore_members_active_uq ON public.drugstore_members USING btree (drugstore_id, user_id) WHERE (deleted_at IS NULL);


--
-- Name: drugstore_members_owner_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX drugstore_members_owner_uq ON public.drugstore_members USING btree (drugstore_id) WHERE ((member_role = 'propietario'::text) AND (deleted_at IS NULL));


--
-- Name: drugstore_members_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX drugstore_members_user_idx ON public.drugstore_members USING btree (user_id) WHERE (deleted_at IS NULL);


--
-- Name: expiration_products_batch_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX expiration_products_batch_uq ON public.expiration_products USING btree (drugstore_id, lower(product_name), lower(batch)) WHERE (deleted_at IS NULL);


--
-- Name: expiration_products_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expiration_products_expiry_idx ON public.expiration_products USING btree (drugstore_id, expires_on) WHERE (deleted_at IS NULL);


--
-- Name: imports_drugstore_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX imports_drugstore_idx ON public.imports USING btree (drugstore_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: improvement_actions_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX improvement_actions_due_idx ON public.improvement_actions USING btree (drugstore_id, due_on) WHERE (deleted_at IS NULL);


--
-- Name: instrument_versions_one_current_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX instrument_versions_one_current_uq ON public.instrument_versions USING btree ((true)) WHERE is_current;


--
-- Name: local_migrations_content_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX local_migrations_content_uq ON public.local_migrations USING btree (user_id, content_hash, is_demo) WHERE (phase <> 'revertida'::text);


--
-- Name: password_resets_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX password_resets_user_idx ON public.password_resets USING btree (user_id);


--
-- Name: segregation_checks_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX segregation_checks_date_idx ON public.segregation_checks USING btree (drugstore_id, checked_on DESC) WHERE (deleted_at IS NULL);


--
-- Name: sessions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_idx ON public.sessions USING btree (user_id);


--
-- Name: training_topics_name_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_topics_name_uq ON public.training_topics USING btree (drugstore_id, lower(topic_name)) WHERE (deleted_at IS NULL);


--
-- Name: trainings_worker_topic_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX trainings_worker_topic_uq ON public.trainings USING btree (drugstore_id, worker_id, topic_id) WHERE (deleted_at IS NULL);


--
-- Name: users_deletion_scheduled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_deletion_scheduled_idx ON public.users USING btree (deletion_scheduled_at) WHERE (deletion_scheduled_at IS NOT NULL);


--
-- Name: users_email_lower_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_lower_uq ON public.users USING btree (lower(email));


--
-- Name: waste_records_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waste_records_date_idx ON public.waste_records USING btree (drugstore_id, recorded_on DESC) WHERE (deleted_at IS NULL);


--
-- Name: workers_code_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workers_code_uq ON public.workers USING btree (drugstore_id, lower(worker_code)) WHERE (deleted_at IS NULL);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: diagnoses diagnoses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: diagnoses diagnoses_drugstore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_drugstore_id_fkey FOREIGN KEY (drugstore_id) REFERENCES public.drugstores(id) ON DELETE CASCADE;


--
-- Name: diagnoses diagnoses_instrument_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_instrument_version_id_fkey FOREIGN KEY (instrument_version_id) REFERENCES public.instrument_versions(id) ON DELETE RESTRICT;


--
-- Name: diagnoses diagnoses_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: diagnosis_answers diagnosis_answers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_answers
    ADD CONSTRAINT diagnosis_answers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: diagnosis_answers diagnosis_answers_diagnosis_id_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_answers
    ADD CONSTRAINT diagnosis_answers_diagnosis_id_version_id_fkey FOREIGN KEY (diagnosis_id, version_id) REFERENCES public.diagnoses(id, instrument_version_id) ON DELETE CASCADE;


--
-- Name: diagnosis_answers diagnosis_answers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_answers
    ADD CONSTRAINT diagnosis_answers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: diagnosis_answers diagnosis_answers_version_id_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_answers
    ADD CONSTRAINT diagnosis_answers_version_id_item_id_fkey FOREIGN KEY (version_id, item_id) REFERENCES public.instrument_items(version_id, id);


--
-- Name: diagnosis_area_scores diagnosis_area_scores_diagnosis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_area_scores
    ADD CONSTRAINT diagnosis_area_scores_diagnosis_id_fkey FOREIGN KEY (diagnosis_id) REFERENCES public.diagnoses(id) ON DELETE CASCADE;


--
-- Name: drugstore_members drugstore_members_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drugstore_members
    ADD CONSTRAINT drugstore_members_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: drugstore_members drugstore_members_drugstore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drugstore_members
    ADD CONSTRAINT drugstore_members_drugstore_id_fkey FOREIGN KEY (drugstore_id) REFERENCES public.drugstores(id) ON DELETE CASCADE;


--
-- Name: drugstore_members drugstore_members_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drugstore_members
    ADD CONSTRAINT drugstore_members_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: drugstore_members drugstore_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drugstore_members
    ADD CONSTRAINT drugstore_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: drugstores drugstores_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drugstores
    ADD CONSTRAINT drugstores_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: drugstores drugstores_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drugstores
    ADD CONSTRAINT drugstores_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expiration_products expiration_products_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiration_products
    ADD CONSTRAINT expiration_products_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expiration_products expiration_products_drugstore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiration_products
    ADD CONSTRAINT expiration_products_drugstore_id_fkey FOREIGN KEY (drugstore_id) REFERENCES public.drugstores(id) ON DELETE CASCADE;


--
-- Name: expiration_products expiration_products_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiration_products
    ADD CONSTRAINT expiration_products_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: imports imports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT imports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: imports imports_drugstore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT imports_drugstore_id_fkey FOREIGN KEY (drugstore_id) REFERENCES public.drugstores(id) ON DELETE CASCADE;


--
-- Name: imports imports_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT imports_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: improvement_actions improvement_actions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.improvement_actions
    ADD CONSTRAINT improvement_actions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: improvement_actions improvement_actions_drugstore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.improvement_actions
    ADD CONSTRAINT improvement_actions_drugstore_id_fkey FOREIGN KEY (drugstore_id) REFERENCES public.drugstores(id) ON DELETE CASCADE;


--
-- Name: improvement_actions improvement_actions_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.improvement_actions
    ADD CONSTRAINT improvement_actions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: instrument_items instrument_items_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrument_items
    ADD CONSTRAINT instrument_items_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.instrument_versions(id) ON DELETE RESTRICT;


--
-- Name: local_migrations local_migrations_drugstore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_migrations
    ADD CONSTRAINT local_migrations_drugstore_id_fkey FOREIGN KEY (drugstore_id) REFERENCES public.drugstores(id) ON DELETE CASCADE;


--
-- Name: local_migrations local_migrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_migrations
    ADD CONSTRAINT local_migrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: segregation_checks segregation_checks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segregation_checks
    ADD CONSTRAINT segregation_checks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: segregation_checks segregation_checks_drugstore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segregation_checks
    ADD CONSTRAINT segregation_checks_drugstore_id_fkey FOREIGN KEY (drugstore_id) REFERENCES public.drugstores(id) ON DELETE CASCADE;


--
-- Name: segregation_checks segregation_checks_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segregation_checks
    ADD CONSTRAINT segregation_checks_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: support_files support_files_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_files
    ADD CONSTRAINT support_files_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_files support_files_drugstore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_files
    ADD CONSTRAINT support_files_drugstore_id_fkey FOREIGN KEY (drugstore_id) REFERENCES public.drugstores(id) ON DELETE CASCADE;


--
-- Name: support_files support_files_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_files
    ADD CONSTRAINT support_files_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: training_topics training_topics_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_topics
    ADD CONSTRAINT training_topics_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: training_topics training_topics_drugstore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_topics
    ADD CONSTRAINT training_topics_drugstore_id_fkey FOREIGN KEY (drugstore_id) REFERENCES public.drugstores(id) ON DELETE CASCADE;


--
-- Name: training_topics training_topics_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_topics
    ADD CONSTRAINT training_topics_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: trainings trainings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: trainings trainings_drugstore_id_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_drugstore_id_topic_id_fkey FOREIGN KEY (drugstore_id, topic_id) REFERENCES public.training_topics(drugstore_id, id) ON DELETE CASCADE;


--
-- Name: trainings trainings_drugstore_id_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_drugstore_id_worker_id_fkey FOREIGN KEY (drugstore_id, worker_id) REFERENCES public.workers(drugstore_id, id) ON DELETE CASCADE;


--
-- Name: trainings trainings_support_file_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_support_file_fk FOREIGN KEY (drugstore_id, support_file_id) REFERENCES public.support_files(drugstore_id, id);


--
-- Name: trainings trainings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: waste_records waste_records_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_records
    ADD CONSTRAINT waste_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: waste_records waste_records_drugstore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_records
    ADD CONSTRAINT waste_records_drugstore_id_fkey FOREIGN KEY (drugstore_id) REFERENCES public.drugstores(id) ON DELETE CASCADE;


--
-- Name: waste_records waste_records_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_records
    ADD CONSTRAINT waste_records_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: workers workers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workers
    ADD CONSTRAINT workers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: workers workers_drugstore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workers
    ADD CONSTRAINT workers_drugstore_id_fkey FOREIGN KEY (drugstore_id) REFERENCES public.drugstores(id) ON DELETE CASCADE;


--
-- Name: workers workers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workers
    ADD CONSTRAINT workers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict nNXZBcCfofQAJ36rqtiw4gDa3wfGRwHclgaWA71cLVsLZFPls0a0hEXPfv4zn4S

