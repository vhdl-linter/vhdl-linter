library test_library;
library TestLibrary;
library TEST_LIBRARY;
entity ent is
  generic (
    i_snake_case: integer; -- vhdl-linter-disable-line unused
    InPascalCase: integer -- vhdl-linter-disable-line unused
  );
end entity;
architecture arch of ent is
    constant camelCase: integer := 2; -- vhdl-linter-disable-line unused
    constant CONSTANT_CASE: integer := 2; -- vhdl-linter-disable-line unused
    type test is (enumCamel, ENUM_CONSTANT, enum_snake, EnumPascal); -- vhdl-linter-disable-line unused
begin
end architecture;