-- vhdl-linter-disable type-resolved
-- vhdl-linter-disable port-declaration

library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity my_module is

end my_module;

architecture rtl of my_module is
begin

end rtl;

configuration my_module_cfg of my_module_wrong_name is -- wrong entity reference
    for rtl
    end for;
end configuration;

library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity my_module_wrapper is

end my_module_wrapper;

architecture rtl of my_module_wrapper is
begin
    wrapper : configuration work.my_module_cfg;
end rtl;
