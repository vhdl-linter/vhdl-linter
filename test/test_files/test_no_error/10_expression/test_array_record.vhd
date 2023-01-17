entity test_array_record is
end entity;
architecture arch of test_array_record is
  type testA_r is record
    foo : integer;
  end record;
  type test_r is record
    foo   : integer;
    dummy : testA_r;
  end record;
  type test_r_array is array (positive range <>) of test_r;
  signal bar_array : test_r_array(1 to 5);
  signal test1     : integer;           -- vhdl-linter-disable-line unused
  signal test2     : integer;           -- vhdl-linter-disable-line unused
begin
  test1                  <= bar_array(5).foo;
  test2                  <= bar_array(5).dummy.foo;
  bar_array(5).dummy.foo <= 5;
end architecture;
