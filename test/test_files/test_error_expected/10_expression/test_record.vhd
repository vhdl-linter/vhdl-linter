entity test_record is
end entity;
architecture arch of test_record is
  type test_a is record
    foo : integer;
  end record;
  type test_b is record -- vhdl-linter-disable-line unused
    bar : integer;
  end record;
  signal a : test_a; -- vhdl-linter-disable-line unused
  signal test_out : integer; -- vhdl-linter-disable-line unused
begin
  -- TODO: Implement better checking for selected Name
  test_out <= a.bar; -- bar belongs to test_b not test_a is not valid here
  Parser Error to trigger error;
end architecture;
