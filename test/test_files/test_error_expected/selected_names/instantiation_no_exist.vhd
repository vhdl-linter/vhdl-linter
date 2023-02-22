library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
entity dummy is
end entity;
entity instantiation_no_exist is
end instantiation_no_exist;

architecture arch of instantiation_no_exist is

begin
  label1: entity work.dummy; -- this is valid

  label: entity work.do_not_care.dummy; -- Wrong selected name (prefix makes no sense)
end architecture;
