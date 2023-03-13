-- vhdl-linter-disable port-declaration
entity pkg_in_port_map is
end entity;
architecture arch of pkg_in_port_map is
  type test is array (positive) of work.dummy_pkg;
begin

end architecture;
