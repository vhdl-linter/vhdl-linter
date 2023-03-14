-- vhdl-linter-disable port-declaration
entity pkg_in_array_index is
end entity;
architecture arch of pkg_in_array_index is
  type test_unused is array (work.dummy_pkg) of integer;
begin

end architecture;
