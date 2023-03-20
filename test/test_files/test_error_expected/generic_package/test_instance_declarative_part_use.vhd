library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_instances_no_use is
end test_instances_no_use;
architecture arch of test_instances_no_use is
  
  package pkg_instanceInArch is
      new work.generic_pkg
          generic map (does_not_exist => 16); -- does_not_exist doesn't exist
  use pkg_instanceInArch.all;
begin
end arch;
