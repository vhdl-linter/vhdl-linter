library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_entity is
end test_entity;

architecture arch of test_entity is

begin
end architecture arch;

configuration test_entity_cfg of test_entity is
    for arch
    end for;
end configuration;



entity configuration_wrapper is
end entity;
architecture arch of configuration_wrapper is
begin
    label: configuration work.test_entity_cfg;
end architecture;