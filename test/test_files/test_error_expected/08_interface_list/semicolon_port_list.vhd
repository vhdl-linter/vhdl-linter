entity semicolon_port_list is
  port (
    input : in std_logic; -- expect error about semicolon at end of interface listr
    );
end entity;
