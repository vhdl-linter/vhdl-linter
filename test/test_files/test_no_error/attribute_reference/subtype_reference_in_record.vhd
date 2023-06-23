entity subtype_reference_in_record is
end entity;
architecture arch of subtype_reference_in_record is
  type test_record_inner is record
    foo_inner : integer;
  end record;

  signal test_signal_inner_unused : test_record_inner;
  type test_record is record
    foo : test_signal_inner_unused'subtype;
  end record;
  signal test_signal_unused : test_record;
  type test_record_advanced is record
    bar : test_signal_unused'subtype;
  end record;
  signal test : test_record_advanced;
begin
  test.bar.foo.foo_inner <= test.bar.foo.foo_inner;
end architecture;
