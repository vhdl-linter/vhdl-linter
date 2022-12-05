entity record_type is
  port (
    test_o : out integer
    );
end entity;
architecture arch of record_type is
  type test_R is record
    foo : integer;
  end record;
  type test_r_array is array (positive range <>) of test_r;
  signal bar_array : test_r_array(5);
begin
  -- bar.foo          <= 5;
  bar_array(5).foo <= 5;
  test_o           <= bar_array(5).foo;
end architecture;
