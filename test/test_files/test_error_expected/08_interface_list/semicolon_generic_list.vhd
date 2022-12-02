entity semicolon_generic_list is
  generic (
    input : std_logic; -- expect error about semicolon at end of interface listr
    );
end entity;
