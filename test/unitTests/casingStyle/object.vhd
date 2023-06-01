entity ent is
  port (
    i_snake_case: in integer; -- vhdl-linter-disable-line unused
    InPascalCase: in integer -- vhdl-linter-disable-line unused
  );
end entity;
architecture arch of ent is
    signal camelCase: integer; -- vhdl-linter-disable-line unused
    signal CONSTANT_CASE: integer; -- vhdl-linter-disable-line unused
begin
end architecture;