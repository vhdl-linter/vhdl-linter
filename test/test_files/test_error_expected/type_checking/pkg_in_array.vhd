-- vhdl-linter-disable port-declaration
entity pkg_in_port_map is
end entity;
architecture arch of pkg_in_port_map is
  type test_unused is array (positive) of work.dummy_pkg; -- array of package is not allowed
begin

end architecture;
