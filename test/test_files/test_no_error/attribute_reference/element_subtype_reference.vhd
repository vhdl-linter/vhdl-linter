package element_subtype_reference_dummy_package is
  type test_record is record
    foo : integer;
  end record;
  type test_record_array is array (natural range <>) of test_record;
end package;
use work.element_subtype_reference_dummy_package.all;
entity element_subtype_reference is
  port (
    i_test : test_record_array
    );
end entity;
architecture arch of element_subtype_reference is
  signal test      : i_test'element'subtype;
  signal reference : test_record;
begin
  reference.foo <= test.foo;
  test.foo      <= reference.foo;
end architecture;
