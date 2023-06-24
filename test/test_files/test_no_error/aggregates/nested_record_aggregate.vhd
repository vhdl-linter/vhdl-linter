entity nested_record_aggregate is
end entity;
architecture arch of nested_record_aggregate is
  type test_record_inner is record
    foo : integer;
  end record;
  type test_record is record
    bar : test_record_inner;
  end record;
  constant test : test_record := (bar => (foo => 2));
  type test_array is array(0 to 0) of test'subtype;
  constant test_array_constant : test_array := (0 => (bar => (foo => 2)));
begin
  assert true report integer'image(test.bar.foo);
  assert true report integer'image(test_array_constant(0).bar.foo);
end architecture;
