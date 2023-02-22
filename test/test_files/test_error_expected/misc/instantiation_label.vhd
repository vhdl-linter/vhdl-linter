library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
entity dummy is
end entity;
entity instantiation_label is
end instantiation_label;

architecture arch of instantiation_label is

begin
  entity work.dummy; -- Missing label
end architecture;
