entity test_entity_generic_no_use is
generic (
  package test_pkg is new work.generic_pkg generic map (<>) -- test_pkg should be used
  );
end entity;
architecture arch of test_entity_generic_no_use is
  use test_pkg.all;
begin
end arch;