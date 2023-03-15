-- vhdl-linter-disable port-declaration
library ieee;
context ieee.ieee_std_context;

entity simple_test is
  port (
    test : in std_ulogic
    );
end simple_test;
