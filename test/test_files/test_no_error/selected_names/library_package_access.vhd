package pkg is
  constant const : integer := 12;
end package;

library test_selected_names;
entity ent is
end entity;

architecture rtl of ent is
  signal x : integer := test_selected_names.pkg.const; -- test_selected_names should be found -- vhdl-linter-disable-line unused
begin



end architecture;