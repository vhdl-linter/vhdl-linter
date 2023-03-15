-- vhdl-linter-disable port-declaration
package test_pkg is
  constant test_constant : integer := 5;
end package;
---------


use work.all;
entity test_use_clause is
  port (
    test_input2 : integer_vector(test_constant - 1 downto 0) -- is not used
    );
end test_use_clause;