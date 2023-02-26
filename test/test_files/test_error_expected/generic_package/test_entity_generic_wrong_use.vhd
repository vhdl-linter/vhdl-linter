entity test is
generic (
  package test_pkg is new work.generic_pkg generic map (<>) -- vhdl-linter-disable-line unused
  );
end entity;
architecture arch of test is
  use work.test_pkg.all; -- work. should not be here

begin
end arch;
  