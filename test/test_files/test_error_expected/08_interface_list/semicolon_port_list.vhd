entity semicolon_port_list is
  port (
    i_nput : in integer; -- expect error about semicolon at end of interface listr
    );
end entity;
