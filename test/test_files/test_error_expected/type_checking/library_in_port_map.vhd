-- vhdl-linter-disable port-declaration
entity pkg_in_port_map is
  port (
    test : in work -- work is not a type
  );
end entity;