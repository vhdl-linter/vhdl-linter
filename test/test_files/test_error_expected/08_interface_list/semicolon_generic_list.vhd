entity semicolon_generic_list is
  generic (
    i_nput : integer; -- expect error about semicolon at end of interface listr
    );
end entity;
