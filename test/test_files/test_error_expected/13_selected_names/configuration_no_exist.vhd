library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
entity dummy is
end entity;
configuration dummy_cfg of dummy is

end configuration;
entity instantiation_no_exist is
end instantiation_no_exist;

architecture arch of instantiation_no_exist is

begin
  label1: configuration work.dummy_cfg; -- this is correct

  label: configuration work.do_not_care.dummy_cfg; -- Wrong selected name (prefix makes no sense)
end architecture;
