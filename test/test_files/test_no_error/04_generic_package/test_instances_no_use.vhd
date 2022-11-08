library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_instances_no_use is
  generic (
   package pkg_instanceFromGeneric is new work.generic_pkg
                           generic map (<>)
  );
  port (
    o : out integer --vhdl-linter-disable-this-line port-declaration unused
    );
end test_instances_no_use;
architecture arch of test_instances_no_use is

  package pkg_instanceInArch is
      new work.generic_pkg
          generic map (generic_parameter => 16);

  signal test1 : pkg_instanceInArch.t_testData;
  signal test2 : pkg_instanceFromGeneric.t_testData;
begin
  test1 <= test1;
  test2 <= test2;
end arch;
