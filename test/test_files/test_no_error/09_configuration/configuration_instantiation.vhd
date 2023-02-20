-- vhdl-linter-disable type-resolved
-- vhdl-linter-disable port-declaration

library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity my_module is
    port (
        rstn : in std_logic;
        clk  : in std_logic;

        my_port_1 : in  std_logic;
        my_port_2 : out std_logic
        );
end my_module;

architecture rtl of my_module is
begin

    p_name : process(rstn, clk)
    begin
        if (rstn = '0') then
            my_port_2 <= '0';
        elsif rising_edge(clk) then
            my_port_2 <= not my_port_1;
        end if;
    end process p_name;
end rtl;

configuration my_module_cfg of my_module is
    for rtl
    end for;
end configuration;

library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity my_module_wrapper is
    port (
        rstn : in std_logic;
        clk  : in std_logic;

        my_port_1 : in  std_logic;
        my_port_2 : out std_logic

        );
end my_module_wrapper;

architecture rtl of my_module_wrapper is
begin
    wrapper : configuration work.my_module_cfg
        port map(
            rstn      => rstn,
            clk       => clk,
            my_port_1 => my_port_1,
            my_port_2 => my_port_2
            );
end rtl;
