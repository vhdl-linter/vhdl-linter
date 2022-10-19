entity test is
generic (
  package test_pkg is new work.generic_pkg generic map (<>)
  );
end entity;
architecture arch of test is
  use test_pkg.all;
  signal a : integer := generic_parameter;

begin
a <= a;
end arch;