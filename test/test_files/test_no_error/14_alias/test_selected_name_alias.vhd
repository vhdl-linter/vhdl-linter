

entity test_selected_name_alias is
end test_selected_name_alias;

architecture arch of test_selected_name_alias is
  signal bar_unused : work.test_selected_name_alias_pkg.foo;
  alias test_alias is work.test_selected_name_alias_pkg.test_procedure [integer];

begin
  test_alias(5);
end architecture;
