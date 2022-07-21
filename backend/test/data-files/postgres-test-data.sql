CREATE TABLE test (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  age integer NOT NULL
);

INSERT INTO test (name, age) VALUES ('John', 42);
INSERT INTO test (name, age) VALUES ('Jane', 43);
INSERT INTO test (name, age) VALUES ('Joe', 44);
INSERT INTO test (name, age) VALUES ('Jack', 45);

