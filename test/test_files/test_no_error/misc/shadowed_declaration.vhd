entity shadowed_declaration is
end entity;
architecture rtl of shadowed_declaration is
  constant apple : integer := 2;        -- vhdl-linter-disable-line unused

  procedure test(apple : inout integer) is  -- vhdl-linter-disable-line unused
  begin
    apple := 2;  -- is allowed because it writes the procedure parameter and not the constant
  end procedure;
begin
end architecture;
