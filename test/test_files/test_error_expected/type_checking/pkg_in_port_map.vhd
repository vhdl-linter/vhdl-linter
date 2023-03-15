-- vhdl-linter-disable port-declaration
entity pkg_in_port_map is
  port (
    test : in work.dummy_pkg
  );
end entity;