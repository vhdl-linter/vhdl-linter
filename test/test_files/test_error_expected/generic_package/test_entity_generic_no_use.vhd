entity test_entity_generic_no_use is
generic (
  package test_pkg is new work.generic_pkg generic map (<>) -- vhdl-linter-disable-line unused
  );
end entity;
architecture arch of test_entity_generic_no_use is
  signal a : integer := generic_parameter; -- package is not used

begin
a <= a;
end arch;