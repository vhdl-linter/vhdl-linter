entity libray_in_interface_pkg is
generic (
  package test_pkg is new work generic map (<>) -- work is not an uninstantiated package
  );
end entity;