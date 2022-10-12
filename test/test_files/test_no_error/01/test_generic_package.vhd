library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

use work.pkg_genericStuff.all;

entity test is
  generic (
   package pkg_instanceFromGeneric is new work.pkg_genericStuff
                           generic map (<>)
  );
  port (
    o : out integer --vhdl-linter-disable-this-line
    );
end test;
architecture arch of test is
  
  package pkg_instanceInArch is
      new work.pkg_genericStuff
          generic map (g_TEST => 16);

  signal test1 : pkg_instanceInArch.t_testData;
  signal test2 : pkg_instanceFromGeneric.t_testData;
begin
  test1 <= test2;
  test2 <= test1;
end arch;
