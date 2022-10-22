entity test is
generic (
  package test_pkg is new work.generic_pkg_error generic map (<>)
  );
end entity;
architecture arch of test is
  use work.test_pkg.all; -- work. should not be here?
  signal a : integer := generic_parameter;

begin
a <= a;
end arch;