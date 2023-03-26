package generic_pkg is
  generic (
    generic_parameter : integer := 0
    );


end package;

entity test_instances_no_use is
  generic (
     package pkg_instanceInGeneric is
      new work.generic_pkg
      generic map (generic_parameter => 16)
  );
end test_instances_no_use;

architecture arch of test_instances_no_use is
  package pkg_instanceInArch is
    new work.generic_pkg
      generic map (generic_parameter => pkg_instanceInGeneric.generic_parameter);
  begin

end architecture;


  package instantiated_pkg is
    new work.generic_pkg
      generic map (generic_parameter => 42);
