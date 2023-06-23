package dummy_package is
  type test_record is record
    foo : integer;
  end record;
end package;
use work.dummy_package.all;
entity subtype_reference is
  port (
    i_test : test_record
    );
end entity;
architecture arch of subtype_reference is
  signal test : i_test'subtype;
  signal reference : test_record;
begin
  reference.foo <= test.foo;
  test.foo <= reference.foo;
end architecture;
