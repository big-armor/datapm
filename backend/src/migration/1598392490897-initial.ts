import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
--
-- PostgreSQL database dump
--

-- Dumped from database version 11.7 (Debian 11.7-2.pgdg90+1)
-- Dumped by pg_dump version 11.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: user_catalog_permission_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_catalog_permission_enum AS ENUM (
    'MANAGE',
    'CREATE',
    'VIEW',
    'EDIT',
    'DELETE',
    'NONE'
);


ALTER TYPE public.user_catalog_permission_enum OWNER TO postgres;

--
-- Name: user_package_permission_permission_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_package_permission_permission_enum AS ENUM (
    'MANAGE',
    'CREATE',
    'VIEW',
    'EDIT',
    'DELETE',
    'NONE'
);


ALTER TYPE public.user_package_permission_permission_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: apiKey; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."apiKey" (
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id integer NOT NULL,
    last_login timestamp with time zone,
    key character varying(64) NOT NULL,
    secret character varying(64) NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public."apiKey" OWNER TO postgres;

--
-- Name: apiKey_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."apiKey_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."apiKey_id_seq" OWNER TO postgres;

--
-- Name: apiKey_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."apiKey_id_seq" OWNED BY public."apiKey".id;


--
-- Name: catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.catalog (
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id integer NOT NULL,
    "displayName" character varying(64) NOT NULL,
    slug character varying(256) NOT NULL,
    website character varying,
    "isPublic" boolean NOT NULL,
    description text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.catalog OWNER TO postgres;

--
-- Name: catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.catalog_id_seq OWNER TO postgres;

--
-- Name: catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.catalog_id_seq OWNED BY public.catalog.id;


--
-- Name: package; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.package (
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id integer NOT NULL,
    slug character varying(256),
    "displayName" character varying(256),
    description character varying NOT NULL,
    catalog_id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.package OWNER TO postgres;

--
-- Name: package_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.package_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.package_id_seq OWNER TO postgres;

--
-- Name: package_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.package_id_seq OWNED BY public.package.id;

--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id integer NOT NULL,
    last_login timestamp with time zone,
    is_site_admin boolean NOT NULL,
    first_name character varying(30) NOT NULL,
    last_name character varying(150) NOT NULL,
    "emailAddress" character varying(254) NOT NULL,
    is_active boolean NOT NULL,
    sub character varying(255),
    username character varying(256) NOT NULL,
    "twitterHandle" character varying,
    website character varying,
    location character varying,
    description character varying,
    "nameIsPublic" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: user_catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_catalog (
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id integer NOT NULL,
    catalog_id integer NOT NULL,
    user_id integer NOT NULL,
    permission public.user_catalog_permission_enum[] NOT NULL
);


ALTER TABLE public.user_catalog OWNER TO postgres;

--
-- Name: user_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_catalog_id_seq OWNER TO postgres;

--
-- Name: user_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_catalog_id_seq OWNED BY public.user_catalog.id;


--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_id_seq OWNER TO postgres;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: user_package_permission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_package_permission (
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id integer NOT NULL,
    user_id integer NOT NULL,
    package_id integer NOT NULL,
    permission public.user_package_permission_permission_enum[] NOT NULL
);


ALTER TABLE public.user_package_permission OWNER TO postgres;

--
-- Name: user_package_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_package_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_package_permission_id_seq OWNER TO postgres;

--
-- Name: user_package_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_package_permission_id_seq OWNED BY public.user_package_permission.id;


--
-- Name: version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.version (
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id integer NOT NULL,
    "majorVersion" integer NOT NULL,
    "minorVersion" integer NOT NULL,
    "patchVersion" integer NOT NULL,
    package_id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    description character varying(2048) NOT NULL,
    "packageFile" jsonb NOT NULL
);


ALTER TABLE public.version OWNER TO postgres;

--
-- Name: version_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.version_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.version_id_seq OWNER TO postgres;

--
-- Name: version_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.version_id_seq OWNED BY public.version.id;


--
-- Name: apiKey id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."apiKey" ALTER COLUMN id SET DEFAULT nextval('public."apiKey_id_seq"'::regclass);


--
-- Name: catalog id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalog ALTER COLUMN id SET DEFAULT nextval('public.catalog_id_seq'::regclass);


--
-- Name: package id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package ALTER COLUMN id SET DEFAULT nextval('public.package_id_seq'::regclass);

--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: user_catalog id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_catalog ALTER COLUMN id SET DEFAULT nextval('public.user_catalog_id_seq'::regclass);


--
-- Name: user_package_permission id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_package_permission ALTER COLUMN id SET DEFAULT nextval('public.user_package_permission_id_seq'::regclass);


--
-- Name: version id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.version ALTER COLUMN id SET DEFAULT nextval('public.version_id_seq'::regclass);


--
-- Name: user PK_03b91d2b8321aa7ba32257dc321; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "PK_03b91d2b8321aa7ba32257dc321" PRIMARY KEY (id);


--
-- Name: package PK_13c872b39896f33ab6770960b3c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package
    ADD CONSTRAINT "PK_13c872b39896f33ab6770960b3c" PRIMARY KEY (id);


--
-- Name: user_package_permission PK_567ae404b173587961a2d34195e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_package_permission
    ADD CONSTRAINT "PK_567ae404b173587961a2d34195e" PRIMARY KEY (id);


--
-- Name: version PK_6408da5b55ce7e67816383ac555; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.version
    ADD CONSTRAINT "PK_6408da5b55ce7e67816383ac555" PRIMARY KEY (id);


--
-- Name: user_catalog PK_705976c4c96648c3932c3cd783a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_catalog
    ADD CONSTRAINT "PK_705976c4c96648c3932c3cd783a" PRIMARY KEY (id);

--
-- Name: catalog PK_d642939bc5d3e79ff6acd058774; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalog
    ADD CONSTRAINT "PK_d642939bc5d3e79ff6acd058774" PRIMARY KEY (id);


--
-- Name: apiKey PK_e3405c09471bd0544278f7c6251; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."apiKey"
    ADD CONSTRAINT "PK_e3405c09471bd0544278f7c6251" PRIMARY KEY (id);


--
-- Name: apiKey UQ_48d29e54703cce1b328e54d8474; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."apiKey"
    ADD CONSTRAINT "UQ_48d29e54703cce1b328e54d8474" UNIQUE (key);


--
-- Name: catalog UQ_70e71bbbc89ee871113c2afd910; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalog
    ADD CONSTRAINT "UQ_70e71bbbc89ee871113c2afd910" UNIQUE (slug);


--
-- Name: user_package_permission UQ_93ee64dc6b887d478c3b51f9750; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_package_permission
    ADD CONSTRAINT "UQ_93ee64dc6b887d478c3b51f9750" UNIQUE (user_id, package_id);


--
-- Name: package UQ_95891833fd9a8eedf817d00a86e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package
    ADD CONSTRAINT "UQ_95891833fd9a8eedf817d00a86e" UNIQUE (slug, catalog_id);


--
-- Name: version UQ_9704df061188bc9bf3ff560d69a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.version
    ADD CONSTRAINT "UQ_9704df061188bc9bf3ff560d69a" UNIQUE (package_id, "majorVersion", "minorVersion", "patchVersion");


--
-- Name: user UQ_d36092b1ccffbfe9415c2e60c37; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "UQ_d36092b1ccffbfe9415c2e60c37" UNIQUE (sub);


--
-- Name: user_catalog UQ_e3d588bb79116e9449e0ec103ad; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_catalog
    ADD CONSTRAINT "UQ_e3d588bb79116e9449e0ec103ad" UNIQUE (user_id, catalog_id);


--
-- Name: user UQ_ef074a5270e6b67c7882c116fae; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "UQ_ef074a5270e6b67c7882c116fae" UNIQUE ("emailAddress");


--
-- Name: user_package_permission FK_1cd39e4dc6353afdf3658df372b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_package_permission
    ADD CONSTRAINT "FK_1cd39e4dc6353afdf3658df372b" FOREIGN KEY (package_id) REFERENCES public.package(id) ON DELETE CASCADE;


--
-- Name: package FK_28b802ca6a77199d7a4fe4047ba; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package
    ADD CONSTRAINT "FK_28b802ca6a77199d7a4fe4047ba" FOREIGN KEY (catalog_id) REFERENCES public.catalog(id);


--
-- Name: version FK_2bc1bd51e8ca9ed656bf6409e32; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.version
    ADD CONSTRAINT "FK_2bc1bd51e8ca9ed656bf6409e32" FOREIGN KEY (package_id) REFERENCES public.package(id);


--
-- Name: user_package_permission FK_4e7768df9ba276dd9c19e5cad21; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_package_permission
    ADD CONSTRAINT "FK_4e7768df9ba276dd9c19e5cad21" FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: user_catalog FK_57edb9329dde1253de1fa7f0689; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_catalog
    ADD CONSTRAINT "FK_57edb9329dde1253de1fa7f0689" FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: apiKey FK_66e27a5a96ff9903ea6ef80fa4d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."apiKey"
    ADD CONSTRAINT "FK_66e27a5a96ff9903ea6ef80fa4d" FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: user_catalog FK_f9fa4a64248467f2dd5b5fb6cbc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_catalog
    ADD CONSTRAINT "FK_f9fa4a64248467f2dd5b5fb6cbc" FOREIGN KEY (catalog_id) REFERENCES public.catalog(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

`;
export class initial1598392490897 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
