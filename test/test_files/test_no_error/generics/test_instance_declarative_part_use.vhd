library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_instances_no_use is
end test_instances_no_use;
architecture arch of test_instances_no_use is
  
  package pkg_instanceInArch is
      new work.generic_pkg
          generic map (generic_parameter => 16);
  use pkg_instanceInArch.all;

  signal test1 : pkg_instanceInArch.t_testData;
begin
  test1 <= test1;
end arch;
