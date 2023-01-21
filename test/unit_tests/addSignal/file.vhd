entity dummy is
  port (
    i_foo : std_ulogic
    );
end dummy;
entity foo is
end entity;
architecture arch of foo is



begin
  inst_dummy : entity work.dummy port map(
    i_foo => foo
  );
end arch ; -- arch
