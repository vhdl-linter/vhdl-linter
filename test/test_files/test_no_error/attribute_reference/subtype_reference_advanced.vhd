package dummy_package_advanced is
  type test_record is record
    foo : integer;
  end record;
  type test_record_advanced is record
    bar : test_record;
  end record;
end package;
use work.dummy_package_advanced.all;
entity subtype_reference_advanced is
  port (
    i_test : test_record_advanced
    );
end entity;
architecture arch of subtype_reference_advanced is
  signal test : i_test.bar'subtype;
begin
  test.foo <= test.foo;
end architecture;
