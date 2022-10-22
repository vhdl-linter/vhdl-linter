entity test_entity_generic is
generic (
  package test_pkg is new work.generic_pkg generic map (<>)
  );
end entity;
architecture arch of test_entity_generic is
  use test_pkg.all;
  signal a : t_testData;

begin
a.element <= a.element;
end arch;