-- vhdl-linter-disable port-declaration
library ieee;
use ieee.std_logic_1164.all;
entity simple_test is
  port (
    test : in std_ulogic
    );
end simple_test;
