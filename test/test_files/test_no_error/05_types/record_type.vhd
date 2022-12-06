entity record_type is
  port (
    o_test : out integer
    );
end entity;
architecture arch of record_type is
  type testA_r is record
    foo : integer;
  end record;
  type test_r is record
    foo : integer;
    dummy : testA_r;
  end record;
  type test_r_array is array (positive range <>) of test_r;
  signal bar_array : test_r_array(1 to 5);
begin
  -- bar.foo          <= 5;
  bar_array(5).foo <= 5;
  bar_array(5).dummy.foo <= 5;
  o_test           <= bar_array(5).foo + bar_array(5).dummy.foo;
end architecture;
